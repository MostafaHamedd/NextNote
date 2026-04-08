import type { Metadata } from "next";
import HomeLanding from "@/components/HomeLanding";

export const metadata: Metadata = {
  title: "NextNote — Home",
  description:
    "Guitar chords, key, and tempo from recordings—export your progression as MIDI for Logic Pro and other DAWs. Piano visualizer for MIDI and songs.",
};

export default function HomePage() {
  return <HomeLanding />;
}
