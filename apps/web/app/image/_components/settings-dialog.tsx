"use client"

import { useTheme } from "next-themes"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import {
  DEFAULT_PREFS,
  DEFAULT_VIEW_TOGGLES,
  useEditor,
  type ViewToggles,
} from "./editor-context"

const ZOOM_PRESETS = [50, 75, 100, 150]

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { prefs, setPref, viewToggles, setViewToggle } = useEditor()
  const { theme, setTheme } = useTheme()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Editor preferences. Saved to this browser.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Theme</Label>
            <div className="flex gap-1">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={cn(
                    "flex-1 rounded-md border border-border px-3 py-1.5 text-xs capitalize",
                    theme === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Snap threshold</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {prefs.snapThreshold}px
              </span>
            </div>
            <Slider
              min={0}
              max={20}
              step={1}
              value={[prefs.snapThreshold]}
              onValueChange={(v) =>
                setPref(
                  "snapThreshold",
                  Array.isArray(v) ? (v[0] ?? 6) : (v as number)
                )
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>Default zoom</Label>
            <div className="flex gap-1">
              {ZOOM_PRESETS.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setPref("defaultZoom", z)}
                  className={cn(
                    "flex-1 rounded-md border border-border px-2 py-1.5 text-xs",
                    prefs.defaultZoom === z
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {z}%
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>View defaults</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                ["rulers", "grid", "snapping", "guides"] as Array<
                  keyof ViewToggles
                >
              ).map((k) => (
                <label
                  key={k}
                  className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs"
                >
                  <span className="capitalize">{k}</span>
                  <Switch
                    checked={viewToggles[k]}
                    onCheckedChange={(v) => setViewToggle(k, v)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPref("snapThreshold", DEFAULT_PREFS.snapThreshold)
                setPref("defaultZoom", DEFAULT_PREFS.defaultZoom)
                ;(
                  Object.keys(DEFAULT_VIEW_TOGGLES) as Array<keyof ViewToggles>
                ).forEach((k) => setViewToggle(k, DEFAULT_VIEW_TOGGLES[k]))
              }}
            >
              Reset to defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
