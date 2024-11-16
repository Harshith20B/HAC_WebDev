import React from 'react';
import { useLocation } from 'react-router-dom';

function DevisePlanPage() {
  const location = useLocation();
  const { selectedLandmarks } = location.state || { selectedLandmarks: [] };

  return (
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-2xl font-bold my-4">Devise Plan</h2>
      <p className="mb-4">Selected Landmarks:</p>
      <ul className="list-disc list-inside">
        {selectedLandmarks.length ? (
          selectedLandmarks.map((id) => <li key={id}>{id}</li>)
        ) : (
          <p>No landmarks selected.</p>
        )}
      </ul>
    </div>
  );
}

export default DevisePlanPage;
