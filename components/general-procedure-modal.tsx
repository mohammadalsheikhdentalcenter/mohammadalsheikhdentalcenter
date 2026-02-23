//@ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";

interface GeneralProcedureModalProps {
  isOpen: boolean;
  selectedProcedure: string | null;
  existingData?: {
    _id?: string;
    name?: string;
    comments?: string;
    date?: string;
  };
  onClose: () => void;
  onSave: (data: {
    _id?: string;
    name: string;
    comments: string;
    date: string;
  }) => Promise<void> | void;
}

export function GeneralProcedureModal({
  isOpen,
  selectedProcedure,
  existingData,
  onClose,
  onSave,
}: GeneralProcedureModalProps) {
  const [procedureName, setProcedureName] = useState("");
  const [comments, setComments] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProcedureName(existingData?.name || selectedProcedure || "");
      setComments(existingData?.comments || "");
      setDate(
        existingData?.date
          ? new Date(existingData.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      );
      setIsEditing(!!existingData?._id);
    }
  }, [isOpen, selectedProcedure, existingData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("[DEBUG MODAL] handleSave called");
    console.log("[DEBUG MODAL] existingData:", existingData);
    console.log("[DEBUG MODAL] procedureName:", procedureName);
    console.log("[DEBUG MODAL] comments:", comments);
    console.log("[DEBUG MODAL] date:", date);

    if (!procedureName.trim()) {
      toast.error("Procedure name is required");
      return;
    }

    setIsSaving(true);
    try {
      console.log("[DEBUG MODAL] Calling onSave...");
      // Pass the ID for editing, so the parent can determine update vs create
      await onSave({
        _id: existingData?._id,
        name: procedureName,
        comments,
        date,
      });
      console.log("[DEBUG MODAL] onSave completed successfully");
    } catch (error) {
      console.error("[DEBUG MODAL] Error in general procedure save:", error);
    } finally {
      console.log("[DEBUG MODAL] Setting isSaving to false");
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit General Procedure" : "Add General Procedure"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Procedure Name */}
          <div className="space-y-2">
            <Label htmlFor="procedure">Procedure Name</Label>
            <Input
              id="procedure"
              type="text"
              value={procedureName}
              onChange={(e) => setProcedureName(e.target.value)}
              placeholder="Procedure name"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Additional notes about the procedure..."
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 cursor-pointer"
            >
              {isSaving
                ? isEditing
                  ? "Updating..."
                  : "Saving..."
                : isEditing
                  ? "Update Procedure"
                  : "Save Procedure"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
