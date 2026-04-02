"""
MYNVOICE - Development Server Launcher
Run: python dev.py
"""

import subprocess
import sys
import os
import signal
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")

processes = []


def cleanup(*args):
    print("\n\nShutting down...")
    for name, proc in processes:
        try:
            proc.terminate()
            print(f"  Stopped {name}")
        except Exception:
            pass
    # Stop Docker DB
    subprocess.run(
        ["docker-compose", "stop", "db"],
        cwd=ROOT, capture_output=True,
    )
    print("  Stopped PostgreSQL")
    print("\nAll services stopped.")
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)


def main():
    print("=========================================")
    print("  MYNVOICE - Starting all services")
    print("=========================================\n")

    # 1. Start PostgreSQL
    print("[1/4] Starting PostgreSQL...")
    subprocess.run(
        ["docker-compose", "up", "db", "-d"],
        cwd=ROOT, capture_output=True,
    )
    print("  PostgreSQL running on port 5433\n")

    # 2. Wait for DB
    print("[2/4] Waiting for database...")
    for _ in range(30):
        result = subprocess.run(
            ["docker", "exec", "mynvoice-db", "pg_isready", "-U", "mynvoice"],
            capture_output=True,
        )
        if result.returncode == 0:
            break
        time.sleep(1)
    print("  Database ready\n")

    # 3. Backend
    print("[3/4] Starting backend...")

    # Determine venv python path
    if sys.platform == "win32":
        venv_python = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
    else:
        venv_python = os.path.join(BACKEND_DIR, ".venv", "bin", "python")

    if not os.path.exists(venv_python):
        print("  Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", os.path.join(BACKEND_DIR, ".venv")])
        subprocess.run([venv_python, "-m", "pip", "install", "-q", "-r", os.path.join(BACKEND_DIR, "requirements.txt")])

    # Run migrations
    env = os.environ.copy()
    env["PYTHONPATH"] = BACKEND_DIR
    subprocess.run(
        [venv_python, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR, env=env, capture_output=True,
    )

    backend = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
        cwd=BACKEND_DIR, env=env,
    )
    processes.append(("Backend", backend))
    print("  Backend running on http://localhost:8000\n")

    # 4. Frontend
    print("[4/4] Starting frontend...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--port", "3000"],
        cwd=FRONTEND_DIR,
    )
    processes.append(("Frontend", frontend))
    print("  Frontend running on http://localhost:3000\n")

    print("=========================================")
    print("  MYNVOICE is running!")
    print()
    print("  Frontend:  http://localhost:3000")
    print("  API:       http://localhost:8000")
    print("  API Docs:  http://localhost:8000/docs")
    print()
    print("  Press Ctrl+C to stop all services")
    print("=========================================\n")

    # Wait for processes
    try:
        while True:
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"\n{name} exited unexpectedly (code {proc.returncode})")
                    cleanup()
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
