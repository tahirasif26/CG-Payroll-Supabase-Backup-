/** Phase 4 shim — delegates to @/api/assets. Legacy snake_case row shape preserved. */
import {
  useAssets as useAssetsApi,
  useAsset as useAssetApi,
  useCreateAsset as useCreateAssetApi,
  useUpdateAsset as useUpdateAssetApi,
  useDeleteAsset as useDeleteAssetApi,
  type Asset as ApiAsset,
} from "@/api";

export interface AssetRow {
  id: string;
  client_id: string;
  asset_tag: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  status: string;
  assigned_to_id: string | null;
  location: string | null;
  condition: string | null;
}

function adapt(a: ApiAsset): AssetRow {
  return {
    id: a.id,
    client_id: a.clientId,
    asset_tag: a.assetTag,
    name: a.name,
    category: a.category,
    brand: a.brand,
    model: a.model,
    serial_number: a.serialNumber,
    status: a.status,
    assigned_to_id: a.assignedToId,
    location: a.location,
    condition: a.condition,
  };
}

export function useAssets(filters?: { status?: string; employee_id?: string }) {
  const q = useAssetsApi({
    pageSize: 500,
    status: filters?.status as never,
    assignedToId: filters?.employee_id,
  });
  return { ...q, data: (q.data?.data ?? []).map(adapt) };
}

export function useAsset(id: string | undefined) {
  const q = useAssetApi(id);
  return { ...q, data: q.data ? adapt(q.data as ApiAsset) : undefined };
}

export function useCreateAsset() {
  const m = useCreateAssetApi();
  return {
    ...m,
    mutate: (input: Partial<AssetRow>) =>
      m.mutate({
        assetTag: input.asset_tag!,
        name: input.name!,
        category: input.category,
        brand: input.brand,
        model: input.model,
        serialNumber: input.serial_number,
        location: input.location,
        condition: input.condition,
      }),
  };
}

export function useUpdateAsset() {
  const m = useUpdateAssetApi();
  return {
    ...m,
    mutate: ({ id, patch }: { id: string; patch: Partial<AssetRow> }) =>
      m.mutate({
        id,
        body: {
          name: patch.name,
          category: patch.category,
          brand: patch.brand,
          model: patch.model,
          serialNumber: patch.serial_number,
          location: patch.location,
          condition: patch.condition,
        },
      }),
  };
}

export function useDeleteAsset() {
  return useDeleteAssetApi();
}

export function useAssetCategories() { return { data: [], isLoading: false }; }
export function useAssetLocations()  { return { data: [], isLoading: false }; }
export function useAssetConditions() { return { data: [], isLoading: false }; }
export function useAssetStoreItems() { return { data: [], isLoading: false }; }
export function useAssetRequests()   { return { data: [], isLoading: false }; }
