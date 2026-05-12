const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface TextSearchResult {
  places: {
    id: string;
    displayName: { text: string };
    formattedAddress: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    types?: string[];
    businessStatus?: string;
  }[];
  nextPageToken?: string;
}

export async function searchPlaces(
  query: string,
  cidade: string,
  estado: string
): Promise<PlaceResult[]> {
  const textQuery = `${query} em ${cidade}, ${estado}, Brasil`;

  // Use the new Places API (Text Search)
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.businessStatus",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "pt-BR",
        regionCode: "BR",
        maxResultCount: 20,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Places API Error: ${response.status} - ${error}`);
  }

  const data: TextSearchResult = await response.json();

  if (!data.places) {
    return [];
  }

  // Transform to our format
  return data.places.map((place) => ({
    place_id: place.id,
    name: place.displayName?.text || "",
    formatted_address: place.formattedAddress || "",
    formatted_phone_number: place.nationalPhoneNumber,
    international_phone_number: place.internationalPhoneNumber,
    website: place.websiteUri,
    rating: place.rating,
    user_ratings_total: place.userRatingCount,
    types: place.types,
    business_status: place.businessStatus,
  }));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,types,businessStatus",
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const place = await response.json();

  return {
    place_id: place.id,
    name: place.displayName?.text || "",
    formatted_address: place.formattedAddress || "",
    formatted_phone_number: place.nationalPhoneNumber,
    international_phone_number: place.internationalPhoneNumber,
    website: place.websiteUri,
    rating: place.rating,
    user_ratings_total: place.userRatingCount,
    types: place.types,
    business_status: place.businessStatus,
  };
}
