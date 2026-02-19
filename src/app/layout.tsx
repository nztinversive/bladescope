import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BladeScope — Wind Turbine Blade Defect Detection',
  description: 'AI-powered wind turbine blade inspection using YOLO11m + SAHI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-navy-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
