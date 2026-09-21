using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Movau.Api.Infrastructure;

public class JwtService(Settings settings)
{
    public string Create(Guid userId, string type)
    {
        var now = DateTime.UtcNow;
        var expires = type == "access"
            ? now.AddMinutes(settings.JwtAccessTtlMinutes)
            : now.AddDays(settings.JwtRefreshTtlDays);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.JwtSecret));
        var token = new JwtSecurityToken(
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim("type", type),
            ],
            notBefore: now,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public Guid Decode(string token, string expectedType)
    {
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.JwtSecret));
        var principal = handler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ClockSkew = TimeSpan.FromSeconds(30),
        }, out var validated);
        var type = principal.FindFirst("type")?.Value;
        if (type != expectedType)
        {
            throw new SecurityTokenException("Неверный тип токена");
        }
        var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(sub!);
    }
}
