import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { DiscordIcon } from "@/app/discord-icon"

export function JoinCommunityButton({ className }: { className?: string }) {
  return (
    <a
      href="https://discord.gg/UXJM9a2hqE"
      className={cn(
        buttonVariants({ size: "lg" }),
        "gap-1 self-start text-[15px] no-underline",
        className
      )}
    >
      <DiscordIcon className="size-4" />
      Join the community
    </a>
  )
}
