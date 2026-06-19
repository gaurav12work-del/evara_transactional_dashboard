"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property } from "@/types";
import { X } from "lucide-react";

interface PropertyModalProps {
  property: Property | null;
  onClose: () => void;
}

const PropertyModal = ({ property, onClose }: PropertyModalProps) => {
  const [name, setName] = useState(property?.name || "");
  const [address, setAddress] = useState(property?.address || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Property name is required");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in");
      setLoading(false);
      return;
    }

    const payload = {
      name: name.trim(),
      address: address.trim(),
      user_id: user.id,
    };

    if (property) {
      const { error: updateError } = await supabase
        .from("properties")
        .update(payload)
        .eq("id", property.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("properties")
        .insert(payload);

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-modal-title"
    >
      <div className="w-full max-w-md rounded-xl bg-card border border-border p-4 sm:p-6 shadow-xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2
            id="property-modal-title"
            className="text-lg font-semibold text-foreground"
          >
            {property ? "Edit Property" : "Add Property"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="property-name"
              className="block text-sm font-medium text-foreground"
            >
              Property Name *
            </label>
            <input
              id="property-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g., Beach Villa Goa"
              required
              aria-label="Property name"
            />
          </div>

          <div>
            <label
              htmlFor="property-address"
              className="block text-sm font-medium text-foreground"
            >
              Address
            </label>
            <input
              id="property-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g., Calangute, Goa"
              aria-label="Property address"
            />
          </div>

          {error && (
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? "Saving..."
                : property
                ? "Update Property"
                : "Add Property"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyModal;
