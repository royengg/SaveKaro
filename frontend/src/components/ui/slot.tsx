import * as React from "react"

import { cn } from "@/lib/utils"

type AnyProps = Record<string, unknown>

const EVENT_HANDLER_REGEX = /^on[A-Z]/

const composeRefs = <T,>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> => {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return
      if (typeof ref === "function") {
        ref(node)
        return
      }
      try {
        ;(ref as React.MutableRefObject<T | null>).current = node
      } catch {
        // Ignore assignment failures for read-only refs.
      }
    })
  }
}

const mergeProps = (
  slotProps: AnyProps,
  childProps: AnyProps,
): AnyProps => {
  const result: AnyProps = { ...slotProps, ...childProps }

  if ("className" in slotProps || "className" in childProps) {
    result.className = cn(
      slotProps.className as string | undefined,
      childProps.className as string | undefined,
    )
  }

  if ("style" in slotProps || "style" in childProps) {
    result.style = {
      ...(slotProps.style as React.CSSProperties | undefined),
      ...(childProps.style as React.CSSProperties | undefined),
    }
  }

  for (const [key, value] of Object.entries(slotProps)) {
    const childValue = childProps[key]
    if (
      EVENT_HANDLER_REGEX.test(key) &&
      typeof value === "function" &&
      typeof childValue === "function"
    ) {
      result[key] = (...args: unknown[]) => {
        ;(childValue as (...eventArgs: unknown[]) => void)(...args)
        ;(value as (...eventArgs: unknown[]) => void)(...args)
      }
    }
  }

  return result
}

const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ children, ...slotProps }, forwardedRef) => {
    if (!React.isValidElement(children)) {
      return null
    }

    const child = children as React.ReactElement<AnyProps>
    const childProps = child.props as AnyProps
    const mergedProps = mergeProps(slotProps, childProps)
    const childRef = (child as unknown as { ref?: React.Ref<Element> }).ref

    return React.cloneElement(child, {
      ...mergedProps,
      ref: composeRefs(
        forwardedRef as React.Ref<Element> | undefined,
        childRef,
      ),
    })
  },
)

Slot.displayName = "Slot"

export { Slot }
