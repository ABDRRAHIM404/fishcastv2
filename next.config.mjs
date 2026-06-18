/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Supabase Storage public buckets (spot photos / species images).
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      // Spot photo sources: Aglou, Tifnit, Sidi R'bat, Sidi Boulfdail, Douira.
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'piespustyni.pl' },
      { protocol: 'https', hostname: 'ak-d.tripcdn.com' },
      { protocol: 'https', hostname: 'www.marokko-reiseblog.com' },
      { protocol: 'https', hostname: 'explore-agadirsoussmassa.com' },
      { protocol: 'https', hostname: 'blogger.googleusercontent.com' },
    ],
  },
};

export default nextConfig;