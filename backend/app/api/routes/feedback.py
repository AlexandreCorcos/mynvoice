"""Product suggestions from the in-app button.

Deliberately email-only, with no table behind it. Persisting suggestions would
mean a migration, and the migration chain currently has work in flight — a
second head would stop `alembic upgrade head` and take the deploy down with it.
The trade-off is stated honestly to the caller instead of hidden: if the send
fails, the endpoint says so rather than returning 200 and dropping the note.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.core import ratelimit
from app.models.user import User
from app.services.email import send_feedback_email

router = APIRouter()

# Generous for a person, pointless for a script. Keyed on the account rather
# than the address: the whole point is that a signed-in user sends this, and an
# account is the harder thing to make lots of.
PER_USER = 5
PER_WINDOW = 60 * 60


class FeedbackIn(BaseModel):
    message: str = Field(min_length=5, max_length=4000)


@router.post("", status_code=202)
async def send_feedback(
    data: FeedbackIn,
    request: Request,
    user: User = Depends(get_current_user),
):
    message = data.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Write something first.")

    ratelimit.limit(
        f"feedback:user:{user.id}", limit_count=PER_USER, per_seconds=PER_WINDOW
    )

    name = " ".join(p for p in [user.first_name, user.last_name] if p) or user.email

    delivered = await send_feedback_email(
        from_email=user.email,
        from_name=name,
        message=message,
    )
    if not delivered:
        # Nothing stores it, so a failed send means the suggestion is gone.
        # Say so — inviting a retry is better than a silent loss.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't send that just now. Please try again in a moment.",
        )

    return {"ok": True}
