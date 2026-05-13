import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { JoinCommunityButton } from "@/components/join-community-button"
import { ProductCard, type Product } from "@/components/product-card"

import audioIllustration from "./audio/illustration.webp"
import { GitHubIcon } from "./github-icon"
import imageIllustration from "@workspace/image-editor/assets/illustration.webp"
import uiIllustration from "@workspace/ui-editor/assets/illustration.webp"
import { LogoMenu } from "./logo-menu"

const GITHUB_URL = "https://github.com/alexisbchz/hypercreate"

const products: Product[] = [
  {
    href: "/image",
    title: "Image",
    description: "Edit images right in your browser.",
    illustration: imageIllustration,
  },
  {
    href: "/audio",
    title: "Audio",
    description: "Generate and edit audio with AI.",
    illustration: audioIllustration,
  },
  {
    href: "/ui",
    title: "UI",
    description: "Build UI components",
    illustration: uiIllustration,
  },
]

export default function Page() {
  return (
    <div className="flex min-h-svh p-8">
      <div className="flex max-w-3xl min-w-0 flex-col gap-4 text-sm leading-loose">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>~</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div>
          <LogoMenu />
          <h1 className="text-lg font-semibold">Hypercreate</h1>
          <p className="text-lg text-muted-foreground">
            An open source creativity suite.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <JoinCommunityButton />
          <a
            href={GITHUB_URL}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "gap-1 self-start text-[15px] no-underline"
            )}
          >
            <GitHubIcon className="mr-1 size-4" />
            Star on GitHub
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-12">
          {products.map((product) => (
            <ProductCard key={product.href} product={product} />
          ))}
        </div>
      </div>
    </div>
  )
}
