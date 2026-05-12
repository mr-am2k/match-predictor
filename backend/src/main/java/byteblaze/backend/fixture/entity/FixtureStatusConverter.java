package byteblaze.backend.fixture.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class FixtureStatusConverter implements AttributeConverter<FixtureStatus, String> {

    @Override
    public String convertToDatabaseColumn(final FixtureStatus attribute) {
        return attribute == null ? null : attribute.apiCode();
    }

    @Override
    public FixtureStatus convertToEntityAttribute(final String dbData) {
        return FixtureStatus.fromApiCode(dbData);
    }
}
