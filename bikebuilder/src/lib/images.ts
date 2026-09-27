/**
 * Photography (Unsplash). Each entry was checked to show the described scene.
 * Swap for owned/licensed brand photography before launch.
 */
const u = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const PHOTOS = {
  heroMtbJump: u("1506316940527-4d1c138978a0"),
  roadStudio: u("1532298229144-0ec0c57515c7"),
  hardtailHill: u("1575585269294-7d28dd912db8"),
  bikepackingSunset: u("1511994298241-608e28f14fde"),
  gravelWall: u("1576435728678-68d0fbf94e91"),
  xcRacerWater: u("1544191696-102dbdaeeaa0"),
  roadDuoCoast: u("1541625602330-2277a4c46182"),
  peloton: u("1517649763962-0c623066013b"),
  roadForest: u("1534787238916-9ba6764efd4f"),
  mountainRoad: u("1471506480208-91b3a4cc78be"),
  groupRideForest: u("1600403477955-2b8c2cfab221"),
  riderSmoke: u("1605235186583-a8272b61f9fe"),
} as const;
