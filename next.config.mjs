/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The reference Python app must not be type-checked or bundled.
  outputFileTracingExcludes: {
    "*": ["./reference/**", "./docs/**"],
  },
};

export default nextConfig;
