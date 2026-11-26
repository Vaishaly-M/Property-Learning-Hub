/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
    ],
  },
  async redirects() {
    return [
      {
        // Nested /payment/success was 404ing under Next turbopack; keep Stripe return URLs working.
        source: '/payment/success',
        destination: '/payment-success',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
