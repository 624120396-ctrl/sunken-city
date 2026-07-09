import { Modal } from './ui/Modal';
import { UserProfileCard, type UserProfile } from './UserProfileCard';

export interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ user, isOpen, onClose }: UserProfileModalProps) {
  if (!user) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" className="profile-user-modal">
      <UserProfileCard user={user} />
    </Modal>
  );
}
