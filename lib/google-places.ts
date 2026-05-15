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
  estado: string,
  maxPages: number = 3 // Busca ate 3 paginas = 60 resultados
): Promise<PlaceResult[]> {
  const textQuery = `${query} em ${cidade}, ${estado}, Brasil`;
  const allResults: PlaceResult[] = [];
  let pageToken: string | undefined = undefined;
  let currentPage = 0;

  while (currentPage < maxPages) {
    // Use the new Places API (Text Search)
    const requestBody: Record<string, unknown> = {
      textQuery,
      languageCode: "pt-BR",
      regionCode: "BR",
      maxResultCount: 20,
    };

    // Adiciona pageToken se existir (para proximas paginas)
    if (pageToken) {
      requestBody.pageToken = pageToken;
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.businessStatus,nextPageToken",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Places API Error: ${response.status} - ${error}`);
    }

    const data: TextSearchResult = await response.json();

    if (!data.places || data.places.length === 0) {
      break;
    }

    // Transform e adiciona aos resultados
    const pageResults = data.places.map((place) => ({
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

    allResults.push(...pageResults);
    currentPage++;

    // Verifica se tem mais paginas
    if (data.nextPageToken) {
      pageToken = data.nextPageToken;
      // Aguarda um pouco antes da proxima requisicao (evita rate limiting)
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      break; // Nao tem mais paginas
    }
  }

  return allResults;
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
