import asyncio
import logging
import uuid
from functools import partial

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_client():
    if not settings.R2_ACCOUNT_ID or not settings.R2_ACCESS_KEY_ID:
        return None
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def _public_url(key: str) -> str:
    if settings.R2_PUBLIC_URL:
        return f"{settings.R2_PUBLIC_URL.rstrip('/')}/{key}"
    return f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{settings.R2_BUCKET}/{key}"


def _upload_sync(contents: bytes, key: str, content_type: str) -> str:
    client = _get_client()
    if client is None:
        raise RuntimeError("R2 storage is not configured")
    try:
        client.put_object(
            Bucket=settings.R2_BUCKET,
            Key=key,
            Body=contents,
            ContentType=content_type,
        )
    except Exception as e:
        logger.error("R2 upload failed: bucket=%s key=%s error=%s", settings.R2_BUCKET, key, e)
        raise
    return _public_url(key)


def _delete_sync(key: str) -> None:
    client = _get_client()
    try:
        client.delete_object(Bucket=settings.R2_BUCKET, Key=key)
    except ClientError:
        pass


async def upload_file(contents: bytes, folder: str, filename: str, content_type: str) -> str:
    key = f"{folder}/{filename}"
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_upload_sync, contents, key, content_type))


async def delete_file(url: str) -> None:
    if not url or not settings.R2_ACCOUNT_ID:
        return
    base = _public_url("").rstrip("/") + "/"
    if url.startswith(base):
        key = url[len(base):]
    else:
        return
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, partial(_delete_sync, key))


def is_configured() -> bool:
    return bool(settings.R2_ACCOUNT_ID and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY)
