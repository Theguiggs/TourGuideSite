import { haversineDistance, totalRouteDistance, estimatedWalkingTime } from '../geo';

describe('geo utilities', () => {
  describe('haversineDistance', () => {
    it('should return 0 for same coordinates', () => {
      expect(haversineDistance(43.6583, 6.9215, 43.6583, 6.9215)).toBe(0);
    });

    it('should compute distance between Grasse POIs', () => {
      // Place aux Aires → Parfumerie Fragonard (~160m)
      const dist = haversineDistance(43.6583, 6.9215, 43.6589, 6.9233);
      expect(dist).toBeGreaterThan(0.1);
      expect(dist).toBeLessThan(0.3);
    });

    it('should compute known distance Paris-Lyon (~400km)', () => {
      const dist = haversineDistance(48.8566, 2.3522, 45.764, 4.8357);
      expect(dist).toBeGreaterThan(380);
      expect(dist).toBeLessThan(420);
    });

    it('should be symmetric', () => {
      const d1 = haversineDistance(43.6583, 6.9215, 43.6589, 6.9233);
      const d2 = haversineDistance(43.6589, 6.9233, 43.6583, 6.9215);
      expect(d1).toBeCloseTo(d2, 10);
    });
  });

  describe('totalRouteDistance', () => {
    it('should return 0 for empty array', () => {
      expect(totalRouteDistance([])).toBe(0);
    });

    it('should return 0 for single POI', () => {
      expect(totalRouteDistance([{ latitude: 43.6583, longitude: 6.9215 }])).toBe(0);
    });

    it('should sum distances for 3 Grasse POIs', () => {
      const pois = [
        { latitude: 43.6583, longitude: 6.9215 },
        { latitude: 43.6589, longitude: 6.9233 },
        { latitude: 43.6576, longitude: 6.9246 },
      ];
      const total = totalRouteDistance(pois);
      expect(total).toBeGreaterThan(0.2);
      expect(total).toBeLessThan(0.6);
    });

    it('should return a rounded value (2 decimal places)', () => {
      const pois = [
        { latitude: 43.6583, longitude: 6.9215 },
        { latitude: 43.6589, longitude: 6.9233 },
      ];
      const total = totalRouteDistance(pois);
      const decimalPlaces = total.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('estimatedWalkingTime', () => {
    it('should return 0 for 0 distance', () => {
      expect(estimatedWalkingTime(0)).toBe(0);
    });

    it('should return 12 minutes for 1km at 5km/h', () => {
      expect(estimatedWalkingTime(1)).toBe(12);
    });

    it('should return 60 minutes for 5km', () => {
      expect(estimatedWalkingTime(5)).toBe(60);
    });

    it('should round to nearest minute', () => {
      const result = estimatedWalkingTime(0.3);
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});
