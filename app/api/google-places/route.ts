import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/google-places";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nicho, cidade, estado } = body;

    if (!nicho || !cidade || !estado) {
      return NextResponse.json(
        { error: "Nicho, cidade e estado sao obrigatorios" },
        { status: 400 }
      );
    }

    const places = await searchPlaces(nicho, cidade, estado);

    // Filter places that have phone numbers
    const placesWithPhone = places.filter(
      (place) =>
        place.formatted_phone_number || place.international_phone_number
    );

    return NextResponse.json({
      results: placesWithPhone,
      total: placesWithPhone.length,
      totalWithoutPhone: places.length - placesWithPhone.length,
    });
  } catch (error) {
    console.error("Google Places API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar lugares" },
      { status: 500 }
    );
  }
}
