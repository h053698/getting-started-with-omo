import { Box, Text, useAnimation } from "ink";
import { type ComponentProps, useLayoutEffect, useMemo } from "react";
import { createMarqueeWindow } from "./marquee-window.ts";

export type MarqueeTextProps = {
  readonly text: string;
  readonly width: number;
  readonly active?: boolean;
} & Pick<ComponentProps<typeof Text>, "color" | "bold" | "dimColor">;

/** Scroll overflowing labels; inactive labels show their initial window. */
export function MarqueeText({ text, width, active = true, ...style }: MarqueeTextProps) {
  const window = useMemo(() => createMarqueeWindow(text, width), [text, width]);
  const { time, reset } = useAnimation({ interval: 100, isActive: active && window.overflow > 0 });
  useLayoutEffect(() => {
    reset();
  }, [window, reset]);

  return (
    <Box width={window.width} height={1} flexShrink={0} overflow="hidden">
      <Text {...style} wrap="truncate-end" aria-label={text}>
        {window.at(active ? time : 0).text}
      </Text>
    </Box>
  );
}
