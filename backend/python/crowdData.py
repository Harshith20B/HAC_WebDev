import requests

API_KEY = 'fsq3kYwWlqdBUATP3oH/oiOa2w/cXmBCUv3gwDcR7jxn8Cw='
HEADERS = {
    "Accept": "application/json",
    "Authorization": API_KEY
}

def get_landmark_popularity(landmark):
    # Step 1: Search for the landmark
    search_url = f'https://api.foursquare.com/v3/places/search?query={landmark}&near=India&limit=1'
    search_response = requests.get(search_url, headers=HEADERS)
    search_data = search_response.json()

    if search_data['results']:
        place = search_data['results'][0]
        fsq_id = place['fsq_id']
        name = place['name']
        location = place['location'].get('formatted_address', '')

        # Step 2: Fetch details using fsq_id with additional fields
        details_url = f'https://api.foursquare.com/v3/places/{fsq_id}?fields=fsq_id,name,location,rating,stats,popularity,tips,photos'
        details_response = requests.get(details_url, headers=HEADERS)
        details_data = details_response.json()

        # Gather crowd indicators
        stats = details_data.get('stats', {})
        popularity = details_data.get('popularity', 0)
        
        # Alternative metrics for popularity estimation
        total_tips = stats.get('total_tips', 0)
        total_photos = stats.get('total_photos', 0)
        
        # Calculate a composite popularity score
        # Higher score indicates more popularity/crowds
        popularity_score = (
            details_data.get('rating', 0) * 2 + 
            popularity * 3 + 
            total_tips * 0.5 + 
            total_photos * 0.3
        )

        return {
            'name': name, 
            'location': location, 
            'rating': details_data.get('rating', 0),
            'popularity': popularity,
            'total_tips': total_tips,
            'total_photos': total_photos,
            'popularity_score': popularity_score
        }
    return None

def compare_landmarks(landmarks):
    popularity_data = []
    for landmark in landmarks:
        info = get_landmark_popularity(landmark)
        if info:
            popularity_data.append(info)

    # Sort by least crowded (lower score = less popular)
    sorted_landmarks = sorted(popularity_data, key=lambda x: x['popularity_score'])

    print("Landmarks from least to most crowded:\n")
    for place in sorted_landmarks:
        print(f"{place['name']} ({place['location']})")
        print(f"  Rating: {place['rating']}")
        print(f"  Popularity: {place['popularity']}")
        print(f"  Tips: {place['total_tips']}, Photos: {place['total_photos']}")
        print(f"  Crowd Score: {place['popularity_score']:.1f}\n")

# Example usage
landmarks = ["Taj Mahal", "India Gate", "Gateway of India", "Mysore Palace", "Qutub Minar"]
compare_landmarks(landmarks)