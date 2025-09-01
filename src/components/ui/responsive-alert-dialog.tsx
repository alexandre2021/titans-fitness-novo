import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';

interface ResponsiveAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  children: React.ReactNode; // This will be the footer content
}

export function ResponsiveAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveAlertDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription asChild><div>{description}</div></DialogDescription>
          </DialogHeader>
          <DialogFooter>{children}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription asChild><div>{description}</div></DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-2">{children}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}