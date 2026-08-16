import sys
from pathlib import Path

# Add the 'api' directory to sys.path so absolute imports of 'app' point to api/app
api_dir = Path(__file__).resolve().parent
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

from app.main import app
