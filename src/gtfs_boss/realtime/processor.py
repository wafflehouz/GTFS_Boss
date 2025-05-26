import logging
import requests
# from google.protobuf.json_format import MessageToJson # Not needed
# from google.protobuf.message import Message # Not needed
import json # Use standard json library for direct JSON parsing
# from google.transit import gtfs_realtime_pb2 # Not needed if parsing directly
# from google.protobuf.json_format import MessageToDict # Not needed if parsing directly
import traceback # Import traceback for detailed error logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_and_parse_realtime_feed(feed_url: str) -> dict | None:
    """
    Fetches a GTFS Realtime feed from a URL and parses it as JSON.
    
    Args:
        feed_url: The URL of the GTFS Realtime feed.
        
    Returns:
        A dictionary containing the parsed feed data, or None if fetching or parsing fails.
    """
    try:
        logger.info(f"Fetching realtime feed from {feed_url}")
        response = requests.get(feed_url)
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        
        logger.info(f"Response status code: {response.status_code}")
        logger.info(f"Response content type: {response.headers.get('content-type')}")
        
        # Parse the response content directly as JSON since asJson=true is used
        feed_data = json.loads(response.text)
        
        logger.info("Successfully parsed JSON response")
        
        return feed_data
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch realtime feed: {str(e)}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Failed to decode JSON response: {e}")
        logger.error(f"Raw response content that failed parsing:\n{response.text[:500]}...") # Log first 500 chars
        return None
    except Exception as e:
        # Log any other unexpected errors with traceback
        logger.error(f"An unexpected error occurred during feed processing: {e}\n{traceback.format_exc()}")
        return None

# Removed example usage block
# if __name__ == '__main__':
#    /* ... */ 