import { NextResponse } from "next/server";
import { getLatestSeoSnapshots } from "@/lib/seo-firestore";

/**
 * GET /api/seo/snapshots
 * Returns the latest saved snapshot for search_volume and rankings (for consistency / load last saved).
 */
export async function GET() {
  try {
    const snapshots = await getLatestSeoSnapshots(null, 1);
    const searchVolumeSnap = Array.isArray(snapshots) ? snapshots.find((s) => s.type === "search_volume") : null;
    const rankingsSnap = Array.isArray(snapshots) ? snapshots.find((s) => s.type === "rankings") : null;
    return NextResponse.json({
      search_volume: searchVolumeSnap
        ? {
            result: searchVolumeSnap.result?.result ?? searchVolumeSnap.result,
            saved_at: searchVolumeSnap.created_at,
          }
        : null,
      rankings: rankingsSnap
        ? { ...rankingsSnap.result, saved_at: rankingsSnap.created_at, domain: rankingsSnap.domain }
        : null,
    });
  } catch (err) {
    console.error("[api/seo/snapshots]", err);
    return NextResponse.json(
      { error: err.message || "Failed to load snapshots" },
      { status: 500 }
    );
  }
}
