import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Restyled to KlipKit design system pills & surfaces
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 text-sm font-medium transition-[transform,background,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-bg disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary: "bg-ink text-bg rounded-full font-semibold hover:opacity-95 shadow-sm",
        secondary: "border border-line bg-solid text-ink rounded-full hover:border-line2 hover:bg-soft",
        ghost: "rounded-full hover:bg-soft text-muted hover:text-ink",
        danger: "bg-red text-white rounded-full font-semibold hover:opacity-90",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-[46px] px-6 text-base",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
