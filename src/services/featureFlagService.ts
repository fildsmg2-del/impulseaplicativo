import { apiSettingsService, ApiSetting } from "./apiSettingsService";

export const featureFlagService = {
  async getAllFlags(): Promise<ApiSetting[]> {
    return apiSettingsService.getByCategory("feature_flag");
  },

  async isEnabled(key: string): Promise<boolean> {
    const flag = await apiSettingsService.getByKey(key);
    return flag?.value === "true";
  },

  async toggleFlag(id: string, currentlyEnabled: boolean): Promise<void> {
    await apiSettingsService.update(id, {
      value: currentlyEnabled ? "false" : "true"
    });
  }
};
