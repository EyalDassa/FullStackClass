import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

function MapController({ bounds }) {
  const map = useMap();

  useEffect(() => {
    // First, ensure the map container size is correct.
    map.invalidateSize();

    // Then, fit the bounds if they are provided.
    if (bounds && bounds.length > 0) {
      const latLngBounds = L.latLngBounds(bounds);
      map.fitBounds(latLngBounds, { padding: [50, 50] });
    }
  }, [bounds, map]); // Rerun when bounds or map instance changes

  return null;
}

export default MapController;
