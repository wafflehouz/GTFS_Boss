from ..core.validator import GTFSValidator
import os
from pathlib import Path
import gtfs_kit as gk

def test_validation():
    # Get the path to the sample GTFS feed
    feed_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "Phoenix_GTFS_Data",
        "googletransit.zip"
    )
    
    # Debug: Print feed contents
    print("\nFeed Contents:")
    feed = gk.read_feed(feed_path, dist_units="km")
    for attr in dir(feed):
        if not attr.startswith('_'):
            value = getattr(feed, attr)
            if hasattr(value, 'shape'):
                print(f"- {attr}: {value.shape}")
            else:
                print(f"- {attr}: {value}")
    
    # Create validator and validate feed
    validator = GTFSValidator()
    result = validator.validate_feed(feed)
    
    # Print results
    print("\nValidation Results:")
    print(f"Feed is valid: {result['is_valid']}")
    
    if result['errors']:
        print("\nErrors:")
        for error in result['errors']:
            print(f"- {error['message']}")
    
    if result['warnings']:
        print("\nWarnings:")
        for warning in result['warnings']:
            print(f"- {warning['message']}")

if __name__ == "__main__":
    test_validation() 