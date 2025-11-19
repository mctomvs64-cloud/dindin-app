"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
}

export function FloatingActionButton({ onClick, className }: FloatingActionButtonProps) {
  return (
    <motion.div
      className={cn(
        "fixed bottom-20 right-4 z-40", // Adjust bottom for BottomNav
        "md:bottom-4 md:right-4", // Desktop position
        className
      )}
      animate={{
        scale: [1, 1.03, 1],
        boxShadow: [
          "0 4px 12px rgba(0, 0, 0, 0.1)",
          "0 8px 20px rgba(0, 0, 0, 0.2)",
          "0 4px 12px rgba(0, 0, 0, 0.1)",
        ],
      }}
      transition={{
        duration: 2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 2,
      }}
    >
      <Button
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={onClick}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </motion.div>
  );
}