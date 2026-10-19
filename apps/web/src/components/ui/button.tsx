import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { useMotionRecipe } from "../../design/motion-hooks";

type Props = HTMLMotionProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", className = "", type = "button", ...props }: Props) {
  const { hover, press } = useMotionRecipe();
  return (
    <motion.button
      data-motion-button="true"
      type={type}
      className={`button button-${variant} ${className}`}
      whileHover={props.disabled ? undefined : hover}
      whileTap={props.disabled ? undefined : press}
      {...props}
    />
  );
}
