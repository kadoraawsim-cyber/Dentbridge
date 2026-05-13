import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DentBridge Student Pilot Application",
  description: "Apply to join the DentBridge student pilot.",
};

export default function StudentPilotPage() {
  return (
    <main className="min-h-screen bg-[#F7F6F1]">
      <iframe
        src="/student-pilot/dentbridge-form.html"
        title="DentBridge Student Pilot Application"
        className="block h-screen min-h-screen w-full border-0"
      />
    </main>
  );
}
