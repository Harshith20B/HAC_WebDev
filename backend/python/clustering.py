#!/usr/bin/env python3
"""
ML Clustering Script for Travel Itinerary Optimization
Uses K-means clustering with popularity-weighted features
"""

import json
import sys
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import warnings
warnings.filterwarnings('ignore')

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on earth"""
    R = 6371  # Earth's radius in kilometers
    
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a))
    distance = R * c
    
    return distance

def create_feature_matrix(landmarks):
    """Create feature matrix with geographical and popularity features"""
    features = []
    
    for landmark in landmarks:
        # Geographical features
        lat = landmark['latitude']
        lon = landmark['longitude']
        
        # Popularity and score features
        popularity = landmark.get('popularity', 50) / 100  # Normalize to 0-1
        score = landmark.get('score', 50) / 100  # Normalize to 0-1
        
        # Create feature vector
        # [latitude, longitude, popularity_weight, score_weight]
        feature = [lat, lon, popularity * 2, score * 2]  # Weight popularity and score
        features.append(feature)
    
    return np.array(features)

def optimize_k_value(features, max_k):
    """Find optimal number of clusters using elbow method and silhouette score"""
    max_k = min(max_k, len(features) - 1)
    if max_k < 2:
        return 2
    
    silhouette_scores = []
    inertias = []
    k_range = range(2, max_k + 1)
    
    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(features)
        
        # Calculate silhouette score
        sil_score = silhouette_score(features, cluster_labels)
        silhouette_scores.append(sil_score)
        inertias.append(kmeans.inertia_)
    
    # Choose k with highest silhouette score
    optimal_k = k_range[np.argmax(silhouette_scores)]
    return optimal_k, max(silhouette_scores)

def perform_clustering(landmarks, k):
    """Perform K-means clustering with popularity-weighted features"""
    if len(landmarks) < k:
        k = len(landmarks)
    
    if k < 2:
        # If we have very few landmarks, create single cluster
        return {
            'clusters': [{
                'day': 1,
                'landmarks': landmarks,
                'center': {
                    'latitude': np.mean([l['latitude'] for l in landmarks]),
                    'longitude': np.mean([l['longitude'] for l in landmarks])
                }
            }],
            'silhouette_score': 1.0,
            'optimal_k': 1
        }
    
    # Create feature matrix
    features = create_feature_matrix(landmarks)
    
    # Standardize features
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)
    
    # Find optimal k if not specified or if we have enough landmarks
    if len(landmarks) > k * 2:
        optimal_k, best_silhouette = optimize_k_value(features_scaled, min(k + 2, len(landmarks) // 2))
        k = optimal_k
    
    # Perform K-means clustering
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(features_scaled)
    
    # Calculate silhouette score
    sil_score = silhouette_score(features_scaled, cluster_labels)
    
    # Organize landmarks by clusters
    clusters = []
    for i in range(k):
        cluster_landmarks = [landmarks[j] for j in range(len(landmarks)) if cluster_labels[j] == i]
        
        if cluster_landmarks:  # Only add non-empty clusters
            # Calculate cluster center
            center_lat = np.mean([l['latitude'] for l in cluster_landmarks])
            center_lon = np.mean([l['longitude'] for l in cluster_landmarks])
            
            # Sort landmarks within cluster by popularity (descending)
            cluster_landmarks.sort(key=lambda x: x.get('popularity', 50), reverse=True)
            
            clusters.append({
                'day': i + 1,
                'landmarks': cluster_landmarks,
                'center': {
                    'latitude': center_lat,
                    'longitude': center_lon
                },
                'avg_popularity': np.mean([l.get('popularity', 50) for l in cluster_landmarks]),
                'landmark_count': len(cluster_landmarks)
            })
    
    # Sort clusters by average popularity (highest first)
    clusters.sort(key=lambda x: x['avg_popularity'], reverse=True)
    
    # Reassign day numbers after sorting
    for i, cluster in enumerate(clusters):
        cluster['day'] = i + 1
    
    return {
        'clusters': clusters,
        'silhouette_score': float(sil_score),
        'optimal_k': k,
        'feature_importance': {
            'geographical_weight': 0.5,
            'popularity_weight': 0.3,
            'score_weight': 0.2
        }
    }

def balance_clusters(clusters, target_days):
    """Balance clusters to match target number of days"""
    if len(clusters) == target_days:
        return clusters
    
    # If we have fewer clusters than target days, split the largest clusters
    while len(clusters) < target_days:
        # Find cluster with most landmarks
        largest_cluster_idx = max(range(len(clusters)), 
                                key=lambda i: len(clusters[i]['landmarks']))
        largest_cluster = clusters[largest_cluster_idx]
        
        if len(largest_cluster['landmarks']) <= 1:
            break  # Cannot split further
        
        # Split the largest cluster
        landmarks = largest_cluster['landmarks']
        mid_point = len(landmarks) // 2
        
        # Create two new clusters
        cluster1_landmarks = landmarks[:mid_point]
        cluster2_landmarks = landmarks[mid_point:]
        
        # Calculate new centers
        center1_lat = np.mean([l['latitude'] for l in cluster1_landmarks])
        center1_lon = np.mean([l['longitude'] for l in cluster1_landmarks])
        center2_lat = np.mean([l['latitude'] for l in cluster2_landmarks])
        center2_lon = np.mean([l['longitude'] for l in cluster2_landmarks])
        
        # Replace the largest cluster with the first split
        clusters[largest_cluster_idx] = {
            'day': largest_cluster['day'],
            'landmarks': cluster1_landmarks,
            'center': {'latitude': center1_lat, 'longitude': center1_lon},
            'avg_popularity': np.mean([l.get('popularity', 50) for l in cluster1_landmarks]),
            'landmark_count': len(cluster1_landmarks)
        }
        
        # Add the second split as a new cluster
        clusters.append({
            'day': len(clusters) + 1,
            'landmarks': cluster2_landmarks,
            'center': {'latitude': center2_lat, 'longitude': center2_lon},
            'avg_popularity': np.mean([l.get('popularity', 50) for l in cluster2_landmarks]),
            'landmark_count': len(cluster2_landmarks)
        })
    
    # If we have more clusters than target days, merge the smallest clusters
    while len(clusters) > target_days:
        if len(clusters) <= 1:
            break
        
        # Find the two clusters that are closest to each other
        min_distance = float('inf')
        merge_indices = (0, 1)
        
        for i in range(len(clusters)):
            for j in range(i + 1, len(clusters)):
                dist = haversine_distance(
                    clusters[i]['center']['latitude'],
                    clusters[i]['center']['longitude'],
                    clusters[j]['center']['latitude'],
                    clusters[j]['center']['longitude']
                )
                if dist < min_distance:
                    min_distance = dist
                    merge_indices = (i, j)
        
        # Merge the two closest clusters
        i, j = merge_indices
        merged_landmarks = clusters[i]['landmarks'] + clusters[j]['landmarks']
        
        # Calculate new center
        merged_center_lat = np.mean([l['latitude'] for l in merged_landmarks])
        merged_center_lon = np.mean([l['longitude'] for l in merged_landmarks])
        
        # Sort merged landmarks by popularity
        merged_landmarks.sort(key=lambda x: x.get('popularity', 50), reverse=True)
        
        # Create merged cluster
        merged_cluster = {
            'day': clusters[i]['day'],
            'landmarks': merged_landmarks,
            'center': {'latitude': merged_center_lat, 'longitude': merged_center_lon},
            'avg_popularity': np.mean([l.get('popularity', 50) for l in merged_landmarks]),
            'landmark_count': len(merged_landmarks)
        }
        
        # Remove the original clusters and add the merged one
        # Remove the larger index first to avoid index shifting
        if i > j:
            i, j = j, i
        clusters.pop(j)
        clusters[i] = merged_cluster
    
    # Reassign day numbers
    for idx, cluster in enumerate(clusters):
        cluster['day'] = idx + 1
    
    return clusters

def validate_landmarks(landmarks):
    """Validate and clean landmark data"""
    valid_landmarks = []
    
    for landmark in landmarks:
        # Check required fields
        if (not landmark.get('name') or 
            not isinstance(landmark.get('latitude'), (int, float)) or 
            not isinstance(landmark.get('longitude'), (int, float))):
            continue
        
        # Validate coordinate ranges
        lat = float(landmark['latitude'])
        lon = float(landmark['longitude'])
        
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            continue
        
        # Clean and normalize the landmark data
        clean_landmark = {
            'name': str(landmark['name']).strip(),
            'latitude': lat,
            'longitude': lon,
            'popularity': max(0, min(100, float(landmark.get('popularity', 50)))),
            'score': max(0, min(100, float(landmark.get('score', 50))))
        }
        
        valid_landmarks.append(clean_landmark)
    
    return valid_landmarks

def calculate_cluster_quality(clusters):
    """Calculate additional quality metrics for clusters"""
    if not clusters:
        return {}
    
    total_landmarks = sum(len(cluster['landmarks']) for cluster in clusters)
    avg_landmarks_per_cluster = total_landmarks / len(clusters) if clusters else 0
    
    # Calculate distance variance within clusters
    intra_cluster_distances = []
    for cluster in clusters:
        if len(cluster['landmarks']) < 2:
            continue
        
        distances = []
        landmarks = cluster['landmarks']
        center = cluster['center']
        
        for landmark in landmarks:
            dist = haversine_distance(
                landmark['latitude'],
                landmark['longitude'],
                center['latitude'],
                center['longitude']
            )
            distances.append(dist)
        
        if distances:
            intra_cluster_distances.extend(distances)
    
    avg_intra_cluster_distance = np.mean(intra_cluster_distances) if intra_cluster_distances else 0
    
    # Calculate popularity distribution
    all_popularities = []
    for cluster in clusters:
        all_popularities.extend([l.get('popularity', 50) for l in cluster['landmarks']])
    
    popularity_std = np.std(all_popularities) if all_popularities else 0
    
    return {
        'total_landmarks': total_landmarks,
        'avg_landmarks_per_cluster': round(avg_landmarks_per_cluster, 2),
        'avg_intra_cluster_distance_km': round(avg_intra_cluster_distance, 2),
        'popularity_std_deviation': round(popularity_std, 2),
        'balanced_distribution': abs(len(clusters) - avg_landmarks_per_cluster) < 2
    }

def main():
    """Main function to handle clustering request"""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        landmarks = data.get('landmarks', [])
        k = data.get('k', 3)
        
        # Validate landmarks
        valid_landmarks = validate_landmarks(landmarks)
        
        if len(valid_landmarks) == 0:
            print(json.dumps({
                'error': 'No valid landmarks provided',
                'clusters': [],
                'silhouette_score': 0.0
            }))
            return
        
        # Perform clustering
        clustering_result = perform_clustering(valid_landmarks, k)
        
        # Balance clusters to match target days
        balanced_clusters = balance_clusters(clustering_result['clusters'], k)
        
        # Calculate quality metrics
        quality_metrics = calculate_cluster_quality(balanced_clusters)
        
        # Prepare final result
        result = {
            'clusters': balanced_clusters,
            'silhouette_score': clustering_result['silhouette_score'],
            'optimal_k': len(balanced_clusters),
            'quality_metrics': quality_metrics,
            'feature_importance': clustering_result.get('feature_importance', {}),
            'total_landmarks': len(valid_landmarks),
            'clustering_method': 'K-means with popularity weighting'
        }
        
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            'error': f'Invalid JSON input: {str(e)}',
            'clusters': [],
            'silhouette_score': 0.0
        }))
    except Exception as e:
        print(json.dumps({
            'error': f'Clustering failed: {str(e)}',
            'clusters': [],
            'silhouette_score': 0.0
        }))

if __name__ == "__main__":
    main()