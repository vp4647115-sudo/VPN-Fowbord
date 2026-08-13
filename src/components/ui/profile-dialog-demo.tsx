"use client";

import { useCharacterLimit } from "@/components/hooks/use-character-limit";
import { useImageUpload } from "@/components/hooks/use-image-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, ImagePlus, X } from "lucide-react";
import React, { useId, useState, useEffect } from "react";

interface ProfileEditDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: any;
  onSave?: (data: any) => void;
  trigger?: React.ReactNode;
}

function ProfileEditDialog({ open, onOpenChange, initialData, onSave, trigger }: ProfileEditDialogProps) {
  const id = useId();

  const maxLength = 180;
  const {
    value,
    characterCount,
    handleChange,
    maxLength: limit,
  } = useCharacterLimit({
    maxLength,
    initialValue: initialData?.otherDetails || initialData?.bio || "Hey, I am using FlowBoard.ai!",
  });

  const [firstName, setFirstName] = useState(initialData?.firstName || "Margaret");
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || "+1 (555) 019-2834");
  const [email, setEmail] = useState(initialData?.email || "user@example.com");
  const [location, setLocation] = useState(initialData?.location || "San Francisco, CA");

  useEffect(() => {
    if (initialData) {
      if (initialData.firstName) setFirstName(initialData.firstName);
      if (initialData.phoneNumber) setPhoneNumber(initialData.phoneNumber);
      if (initialData.email) setEmail(initialData.email);
      if (initialData.location) setLocation(initialData.location);
    }
  }, [initialData]);

  const handleSave = () => {
    const updated = {
      firstName,
      phoneNumber,
      email,
      location,
      otherDetails: value,
      updatedAt: new Date().toISOString(),
      isProfileCompleted: true,
    };

    localStorage.setItem('flowboard_user_profile', JSON.stringify(updated));

    if (onSave) {
      onSave(updated);
    }
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex flex-col gap-0 overflow-y-visible p-0 sm:max-w-lg [&>button:last-child]:top-3.5 bg-white text-slate-900 border-slate-200 shadow-2xl rounded-2xl">
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b border-slate-200 px-6 py-4 text-base font-extrabold text-slate-900">
            Edit Profile Details
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Make changes to your user profile here. Update your details and save.
        </DialogDescription>
        <div className="overflow-y-auto max-h-[75vh]">
          <ProfileBg defaultImage="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80" />
          <Avatar defaultImage="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop" />
          <div className="px-6 pb-6 pt-4">
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`${id}-first-name`} className="text-xs font-bold text-slate-900 uppercase">First Name *</Label>
                  <Input
                    id={`${id}-first-name`}
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    type="text"
                    required
                    className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`${id}-phone`} className="text-xs font-bold text-slate-900 uppercase">Phone Number *</Label>
                  <Input
                    id={`${id}-phone`}
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    type="tel"
                    required
                    className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${id}-email`} className="text-xs font-bold text-slate-900 uppercase">Email ID *</Label>
                <Input
                  id={`${id}-email`}
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${id}-location`} className="text-xs font-bold text-slate-900 uppercase">Location *</Label>
                <div className="relative">
                  <Input
                    id={`${id}-location`}
                    className="peer pe-9 bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    placeholder="e.g. San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    type="text"
                    required
                  />
                  <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-muted-foreground/80 peer-disabled:opacity-50">
                    <Check
                      size={16}
                      strokeWidth={2}
                      className="text-emerald-500"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${id}-bio`} className="text-xs font-bold text-slate-900 uppercase">Other Details / Bio</Label>
                <Textarea
                  id={`${id}-bio`}
                  placeholder="Write a few sentences about yourself or your organization"
                  value={value}
                  maxLength={maxLength}
                  onChange={handleChange}
                  aria-describedby={`${id}-description`}
                  className="bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 min-h-[90px]"
                />
                <p
                  id={`${id}-description`}
                  className="mt-2 text-right text-xs text-slate-500"
                  role="status"
                  aria-live="polite"
                >
                  <span className="tabular-nums font-semibold">{limit - characterCount}</span> characters left
                </p>
              </div>
            </form>
          </div>
        </div>
        <DialogFooter className="border-t border-slate-200 px-6 py-4 bg-slate-50">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-200 cursor-pointer font-semibold">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} className="bg-slate-900 hover:bg-black text-white font-bold px-6 cursor-pointer">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileBg({ defaultImage }: { defaultImage?: string }) {
  const [hideDefault, setHideDefault] = useState(false);
  const { previewUrl, fileInputRef, handleThumbnailClick, handleFileChange, handleRemove } =
    useImageUpload();

  const currentImage = previewUrl || (!hideDefault ? defaultImage : null);

  const handleImageRemove = () => {
    handleRemove();
    setHideDefault(true);
  };

  return (
    <div className="h-32">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-200">
        {currentImage && (
          <img
            className="h-full w-full object-cover"
            src={currentImage}
            alt={previewUrl ? "Preview of uploaded image" : "Default profile background"}
            width={512}
            height={96}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <button
            type="button"
            className="z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-offset-2 transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70"
            onClick={handleThumbnailClick}
            aria-label={currentImage ? "Change image" : "Upload image"}
          >
            <ImagePlus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          {currentImage && (
            <button
              type="button"
              className="z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-offset-2 transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70"
              onClick={handleImageRemove}
              aria-label="Remove image"
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        aria-label="Upload image file"
      />
    </div>
  );
}

function Avatar({ defaultImage }: { defaultImage?: string }) {
  const { previewUrl, fileInputRef, handleThumbnailClick, handleFileChange } = useImageUpload();

  const currentImage = previewUrl || defaultImage;

  return (
    <div className="-mt-10 px-6">
      <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-md">
        {currentImage && (
          <img
            src={currentImage}
            className="h-full w-full object-cover"
            width={80}
            height={80}
            alt="Profile image"
          />
        )}
        <button
          type="button"
          className="absolute flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-offset-2 transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70"
          onClick={handleThumbnailClick}
          aria-label="Change profile picture"
        >
          <ImagePlus size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          aria-label="Upload profile picture"
        />
      </div>
    </div>
  );
}

export { ProfileEditDialog, ProfileEditDialog as Component };
