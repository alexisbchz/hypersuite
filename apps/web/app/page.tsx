import imageIllustration from "./image/illustration.webp"
import { LogoMenu } from "./logo-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { GitHubIcon } from "./github-icon"
import { JoinCommunityButton } from "@/components/join-community-button"
import { ProductCard, type Product } from "@/components/product-card"

const products: Product[] = [
  {
    href: "/image",
    title: "Image",
    description: "Edit images right in your browser.",
    illustration: imageIllustration,
  },
]

export default function Page() {
  return (
    <div className="flex min-h-svh p-8">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>~</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div>
          <LogoMenu />
          <h1 className="text-lg font-semibold">Hypersuite</h1>
          <p className="text-lg text-muted-foreground">
            An open source creative suite.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <JoinCommunityButton />
          <a
            href="https://github.com/alexisbchz/hypersuite"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "gap-1 self-start text-[15px] no-underline"
            )}
          >
            <GitHubIcon className="mr-1 size-4" />
            Star on GitHub
          </a>
        </div>

        <div className="mt-4 flex flex-col gap-6">
          {products.map((product) => (
            <ProductCard key={product.href} product={product} />
          ))}
        </div>
      </div>
    </div>
  )
}
