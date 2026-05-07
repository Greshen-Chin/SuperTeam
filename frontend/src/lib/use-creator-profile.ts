"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export type CreatorProfile = {
  channelName: string;
  platformUrl: string;
};

const EMPTY: CreatorProfile = { channelName: "", platformUrl: "" };

function storageKey(wallet: string | null) {
  return wallet ? `vidchain_profile_${wallet}` : "vidchain_profile_anon";
}

export function useCreatorProfile() {
  const { publicAddress } = useAuth();
  const [profile, setProfile] = useState<CreatorProfile>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(publicAddress));
      setProfile(raw ? (JSON.parse(raw) as CreatorProfile) : EMPTY);
    } catch {
      setProfile(EMPTY);
    }
    setLoaded(true);
  }, [publicAddress]);

  const save = useCallback(
    (next: CreatorProfile) => {
      setProfile(next);
      try {
        localStorage.setItem(storageKey(publicAddress), JSON.stringify(next));
      } catch { /* storage quota exceeded */ }
    },
    [publicAddress]
  );

  return { profile, save, loaded, hasName: loaded && profile.channelName.trim().length > 0 };
}
