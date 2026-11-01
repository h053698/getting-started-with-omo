import { Box, type DOMElement, measureElement } from "ink";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";
import { mouse, type MouseInput } from "./mouse.ts";

type Region = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

type Registry = Map<symbol, { readonly region: () => Region | null; readonly onPress: () => void }>;

const HitContext = createContext<Registry | null>(null);

function absolute(node: DOMElement | null): Region | null {
  if (!node) return null;
  const { x, y, width, height } = measureElement(node);
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

export function HitProvider({ children }: { readonly children: ReactNode }) {
  const registry = useRef<Registry>(new Map()).current;
  useEffect(() => {
    const onPress = (event: MouseInput) => {
      let best: { area: number; onPress: () => void } | null = null;
      for (const entry of registry.values()) {
        const region = entry.region();
        if (!region) continue;
        const inside =
          event.x >= region.x &&
          event.x < region.x + region.width &&
          event.y >= region.y &&
          event.y < region.y + region.height;
        const area = region.width * region.height;
        if (inside && (!best || area < best.area)) best = { area, onPress: entry.onPress };
      }
      best?.onPress();
    };
    mouse.on("press", onPress);
    return () => {
      mouse.off("press", onPress);
    };
  }, [registry]);
  return <HitContext.Provider value={registry}>{children}</HitContext.Provider>;
}

export function Clickable({
  onPress,
  children,
  ...box
}: { readonly onPress: () => void; readonly children: ReactNode } & Omit<ComponentProps<typeof Box>, "children">) {
  const registry = useContext(HitContext);
  const ref = useRef<DOMElement>(null);
  const handler = useRef(onPress);
  handler.current = onPress;
  useLayoutEffect(() => {
    if (!registry) return;
    const id = Symbol("clickable");
    registry.set(id, { region: () => absolute(ref.current), onPress: () => handler.current() });
    return () => {
      registry.delete(id);
    };
  }, [registry]);
  return (
    <Box ref={ref} {...box}>
      {children}
    </Box>
  );
}

export function useWheel(onWheel: (delta: number) => void, isActive = true): void {
  const handler = useRef(onWheel);
  handler.current = onWheel;
  useEffect(() => {
    if (!isActive) return;
    const listener = (delta: number) => handler.current(delta);
    mouse.on("wheel", listener);
    return () => {
      mouse.off("wheel", listener);
    };
  }, [isActive]);
}
