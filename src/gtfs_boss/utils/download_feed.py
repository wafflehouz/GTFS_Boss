import requests
import os
from pathlib import Path

def download_gtfs_feed(url: str, output_path: str) -> str:
    """
    Download a GTFS feed from a URL.
    
    Args:
        url: URL of the GTFS feed
        output_path: Path to save the feed
        
    Returns:
        Path to the downloaded feed
    """
    response = requests.get(url)
    response.raise_for_status()
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Save the file
    with open(output_path, 'wb') as f:
        f.write(response.content)
    
    return output_path

if __name__ == "__main__":
    # Valley Metro GTFS feed URL
    url = "https://www.valleymetro.org/sites/default/files/gtfs/valleymetro_gtfs.zip"
    output_path = "Phoenix_GTFS_Data/valleymetro_gtfs.zip"
    
    try:
        path = download_gtfs_feed(url, output_path)
        print(f"Successfully downloaded GTFS feed to {path}")
    except Exception as e:
        print(f"Error downloading GTFS feed: {e}") 