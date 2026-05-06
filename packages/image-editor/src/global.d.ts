// Static asset declarations consumed via Next.js bundler. Mirrors the
// declarations Next provides in `next-env.d.ts` for image imports.
declare module "*.webp" {
  const content: {
    src: string
    height: number
    width: number
    blurDataURL?: string
    blurWidth?: number
    blurHeight?: number
  }
  export default content
}
