using NpgsqlTypes;

namespace Movau.Api.Domain;

public enum IdentityDocumentKind
{
    [PgName("passport_by")] PassportBy,
    [PgName("id_card_by")] IdCardBy,
    [PgName("other")] Other,
}
