import type { CodeSession, SessionProfile } from "../../types";

export interface SessionTransferSelection {
  source: SessionProfile;
  session: CodeSession;
}

export interface SessionUnlinkSelection {
  instance: SessionProfile;
  session: CodeSession;
}
