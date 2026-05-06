"use client"

import { useEditor } from "../editor"
import { TabBar } from "../chrome/tab-bar"

export function EditorTabBar() {
  const { newTab } = useEditor()
  return <TabBar onRequestNew={() => newTab()} />
}
