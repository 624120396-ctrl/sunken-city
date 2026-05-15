export interface ScenarioCharacter {
  id: string;
  scenarioId: string;
  name: string;
  description: string | null;
  avatar: string | null;
  sprites: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}
