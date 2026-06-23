package byteblaze.backend.fixture.admin.service;

import byteblaze.backend.fixture.admin.dto.AdminFixtureDetail;
import byteblaze.backend.fixture.admin.dto.AdminFixtureSummary;
import byteblaze.backend.fixture.admin.dto.EditFixtureResultRequest;
import byteblaze.backend.fixture.admin.dto.EditFixtureResultResponse;

import java.util.List;

/**
 * Admin operations for manually correcting fixture results and recalculating
 * the points every affected prediction earned.
 */
public interface FixtureAdminService {

    List<String> listRounds(Long competitionId);

    List<AdminFixtureSummary> listFixtures(Long competitionId, String round);

    AdminFixtureDetail getFixture(Long fixtureId);

    EditFixtureResultResponse editResult(Long fixtureId, EditFixtureResultRequest request);
}
