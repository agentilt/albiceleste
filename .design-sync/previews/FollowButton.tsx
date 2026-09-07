import { useState } from "react";
import { FollowButton } from "@albiceleste/ui";

export const NotFollowing = () => <FollowButton pressed={false} onClick={() => {}} labelOn="Siguiendo" labelOff="Seguir" />;
export const Following = () => <FollowButton pressed onClick={() => {}} labelOn="Siguiendo" labelOff="Seguir" />;
export const CompactPair = () => (
  <span className="inline-flex gap-4">
    <FollowButton pressed={false} onClick={() => {}} compact />
    <FollowButton pressed onClick={() => {}} compact />
  </span>
);
export const Interactive = () => {
  const [on, setOn] = useState(false);
  return <FollowButton pressed={on} onClick={() => setOn(!on)} labelOn="Siguiendo" labelOff="Seguir" />;
};
