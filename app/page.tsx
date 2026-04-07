import type { Metadata } from "next";
import HomeLanding from "@/components/HomeLanding";

export const metadata: Metadata = {
  title: "NextNote — Home",
  description:
    "Practice smarter: guitar chords and keys from recordings, plus a piano visualizer for MIDI and songs.",
};

export default function HomePage() {
  return <HomeLanding />;
}
