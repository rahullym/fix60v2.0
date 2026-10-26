import { errorCodes } from '@fix60/shared';
import { badRequest } from '../../common/api-exception';
import type { UsersRepository } from './users.repository';

export interface CustomerLocation {
  districtId: string | null;
  localityId: string | null;
}

/** Validates a district/locality pair; a locality alone implies its district. */
export async function resolveCustomerLocation(
  repository: Pick<UsersRepository, 'districtOfLocality' | 'districtExists'>,
  districtId: string | null,
  localityId: string | null,
): Promise<CustomerLocation> {
  if (localityId) {
    const localityDistrict = await repository.districtOfLocality(localityId);
    if (!localityDistrict || (districtId && districtId !== localityDistrict)) {
      throw badRequest(
        errorCodes.validationFailed,
        'Locality does not belong to the selected district',
      );
    }
    return { districtId: localityDistrict, localityId };
  }
  if (districtId && !(await repository.districtExists(districtId))) {
    throw badRequest(errorCodes.validationFailed, 'Unknown district');
  }
  return { districtId, localityId: null };
}
