import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"

export const metadata = {
  title: "Image",
}

export default function Page() {
  return (
    <div className="flex min-h-svh p-8">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<a href="/">~</a>} />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>image</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div>
          <h1 className="text-lg font-semibold">Image</h1>
          <p className="text-lg text-muted-foreground">
            Edit images right in your browser.
          </p>
        </div>
      </div>
    </div>
  )
}
