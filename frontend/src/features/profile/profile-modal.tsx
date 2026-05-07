"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, User, X } from "lucide-react";
import { useCreatorProfile } from "@/lib/use-creator-profile";
import type { CreatorProfile } from "@/lib/use-creator-profile";
import { useAuth } from "@/context/AuthContext";
import { formatWallet } from "@/lib/utils";

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { profile, save, loaded } = useCreatorProfile();
  const { publicAddress, user } = useAuth();
  const [form, setForm] = useState<CreatorProfile>({ channelName: "", platformUrl: "" });
  const [saved, setSaved] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loaded) setForm(profile);
  }, [loaded, profile]);

  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 120);
  }, [open]);

  function handleSave() {
    save({ channelName: form.channelName.trim(), platformUrl: form.platformUrl.trim() });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  }

  if (!open) return null;

  return (
    <div className="profile-modal-backdrop" onMouseDown={onClose}>
      <div className="profile-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <div className="profile-modal-icon">
            <User size={18} />
          </div>
          <div>
            <h2>Creator Profile</h2>
            <p>Used in your PDF copyright reports</p>
          </div>
          <button className="profile-modal-close" type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {publicAddress ? (
          <div className="profile-wallet-row">
            <span className="profile-wallet-dot" />
            <span>{formatWallet(publicAddress)}</span>
          </div>
        ) : null}

        <div className="profile-form">
          <label className="profile-field">
            <span>
              <User size={13} />
              Channel / Creator Name
              <em>required for PDF</em>
            </span>
            <input
              ref={nameRef}
              className="profile-input"
              placeholder="Your channel or creator name"
              type="text"
              value={form.channelName}
              onChange={(e) => setForm((f) => ({ ...f, channelName: e.target.value }))}
            />
          </label>

          <label className="profile-field">
            <span>
              <Link2 size={13} />
              Platform / Channel URL
              <em>optional</em>
            </span>
            <input
              className="profile-input"
              placeholder="e.g. youtube.com/@rizkydrums"
              type="url"
              value={form.platformUrl}
              onChange={(e) => setForm((f) => ({ ...f, platformUrl: e.target.value }))}
            />
          </label>

          {user?.name ? (
            <p className="profile-autofill-hint">
              Tip: your Web3Auth display name is <strong>{user.name}</strong> — you can use that as your channel name.
            </p>
          ) : null}
        </div>

        <div className="profile-modal-footer">
          <button className="profile-cancel-btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="profile-save-btn"
            disabled={!form.channelName.trim()}
            type="button"
            onClick={handleSave}
          >
            {saved ? (
              <><Check size={14} />Saved!</>
            ) : (
              "Save Profile"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
