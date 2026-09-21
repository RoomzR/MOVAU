import * as Location from "expo-location";

export const MINSK = { latitude: 53.9023, longitude: 27.5619 };

export async function currentPoint() {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return MINSK;
    }
    const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: here.coords.latitude, longitude: here.coords.longitude };
  } catch {
    return MINSK;
  }
}
